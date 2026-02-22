// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PredictionArena
 * @dev Smart contract for Category Bomb Arena prediction system
 * Allows players to stake tokens on match predictions
 */
contract PredictionArena {
    struct Prediction {
        address predictor;
        string matchId;
        string predictedWinner;
        string predictedFirstElimination;
        uint256 stakeAmount;
        uint256 timestamp;
        bool claimed;
    }

    struct Match {
        string matchId;
        bool isFinalized;
        string actualWinner;
        string actualFirstElimination;
        uint256 totalStaked;
        uint256 timestamp;
    }

    // Match ID => Match data
    mapping(string => Match) public matches;

    // Match ID => Predictor address => Prediction
    mapping(string => mapping(address => Prediction)) public predictions;

    // Match ID => Array of predictor addresses
    mapping(string => address[]) public matchPredictors;

    // Events
    event PredictionSubmitted(
        address indexed predictor,
        string matchId,
        string predictedWinner,
        string predictedFirstElimination,
        uint256 stakeAmount
    );

    event MatchFinalized(
        string matchId,
        string actualWinner,
        string actualFirstElimination,
        uint256 totalStaked
    );

    event RewardsClaimed(
        address indexed predictor,
        string matchId,
        uint256 rewardAmount
    );

    // Minimum stake amount
    uint256 public constant MIN_STAKE = 0.001 ether;

    // Contract owner (for administrative functions)
    address public owner;

    // Platform fee (in basis points, 100 = 1%)
    uint256 public platformFee = 250; // 2.5%

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Submit a prediction for a match
     * @param _matchId The ID of the match
     * @param _predictedWinner The predicted winner's player ID
     * @param _predictedFirstElimination The predicted first elimination's player ID
     */
    function submitPrediction(
        string memory _matchId,
        string memory _predictedWinner,
        string memory _predictedFirstElimination
    ) external payable {
        require(msg.value >= MIN_STAKE, "Stake amount too low");
        require(!matches[_matchId].isFinalized, "Match already finalized");
        require(predictions[_matchId][msg.sender].stakeAmount == 0, "Already predicted for this match");

        // Create prediction
        predictions[_matchId][msg.sender] = Prediction({
            predictor: msg.sender,
            matchId: _matchId,
            predictedWinner: _predictedWinner,
            predictedFirstElimination: _predictedFirstElimination,
            stakeAmount: msg.value,
            timestamp: block.timestamp,
            claimed: false
        });

        // Add to predictors list
        matchPredictors[_matchId].push(msg.sender);

        // Update match total staked
        matches[_matchId].totalStaked += msg.value;
        matches[_matchId].matchId = _matchId;

        emit PredictionSubmitted(
            msg.sender,
            _matchId,
            _predictedWinner,
            _predictedFirstElimination,
            msg.value
        );
    }

    /**
     * @dev Finalize a match with results (called by owner/oracle)
     * @param _matchId The ID of the match
     * @param _actualWinner The actual winner's player ID
     * @param _actualFirstElimination The actual first elimination's player ID
     */
    function finalizeMatch(
        string memory _matchId,
        string memory _actualWinner,
        string memory _actualFirstElimination
    ) external onlyOwner {
        require(!matches[_matchId].isFinalized, "Match already finalized");
        
        matches[_matchId].isFinalized = true;
        matches[_matchId].actualWinner = _actualWinner;
        matches[_matchId].actualFirstElimination = _actualFirstElimination;
        matches[_matchId].timestamp = block.timestamp;

        emit MatchFinalized(
            _matchId,
            _actualWinner,
            _actualFirstElimination,
            matches[_matchId].totalStaked
        );
    }

    /**
     * @dev Claim rewards for a prediction
     * @param _matchId The ID of the match
     */
    function claimRewards(string memory _matchId) external {
        Match memory matchData = matches[_matchId];
        require(matchData.isFinalized, "Match not finalized yet");

        Prediction storage prediction = predictions[_matchId][msg.sender];
        require(prediction.stakeAmount > 0, "No prediction found");
        require(!prediction.claimed, "Rewards already claimed");

        // Calculate score based on correct predictions
        uint256 score = calculateScore(
            prediction.predictedWinner,
            prediction.predictedFirstElimination,
            matchData.actualWinner,
            matchData.actualFirstElimination
        );

        require(score > 0, "No rewards to claim");

        // Calculate total winning pool and platform fee
        uint256 totalPool = matchData.totalStaked;
        uint256 platformCut = (totalPool * platformFee) / 10000;
        uint256 rewardPool = totalPool - platformCut;

        // Calculate individual reward based on score
        uint256 totalScore = calculateTotalScore(_matchId);
        uint256 reward = (rewardPool * score) / totalScore;

        // Mark as claimed
        prediction.claimed = true;

        // Transfer reward
        payable(msg.sender).transfer(reward);

        emit RewardsClaimed(msg.sender, _matchId, reward);
    }

    /**
     * @dev Calculate score for a prediction
     */
    function calculateScore(
        string memory predictedWinner,
        string memory predictedFirstElim,
        string memory actualWinner,
        string memory actualFirstElim
    ) internal pure returns (uint256) {
        uint256 score = 0;
        
        // Correct winner prediction: +3 points
        if (keccak256(bytes(predictedWinner)) == keccak256(bytes(actualWinner))) {
            score += 3;
        }
        
        // Correct first elimination prediction: +2 points
        if (keccak256(bytes(predictedFirstElim)) == keccak256(bytes(actualFirstElim))) {
            score += 2;
        }

        return score;
    }

    /**
     * @dev Calculate total score for all predictions in a match
     */
    function calculateTotalScore(string memory _matchId) internal view returns (uint256) {
        Match memory matchData = matches[_matchId];
        address[] memory predictors = matchPredictors[_matchId];
        uint256 totalScore = 0;

        for (uint256 i = 0; i < predictors.length; i++) {
            Prediction memory pred = predictions[_matchId][predictors[i]];
            uint256 score = calculateScore(
                pred.predictedWinner,
                pred.predictedFirstElimination,
                matchData.actualWinner,
                matchData.actualFirstElimination
            );
            totalScore += score;
        }

        return totalScore > 0 ? totalScore : 1; // Avoid division by zero
    }

    /**
     * @dev Get prediction for a specific address and match
     */
    function getPrediction(string memory _matchId, address _predictor) 
        external 
        view 
        returns (Prediction memory) 
    {
        return predictions[_matchId][_predictor];
    }

    /**
     * @dev Get match data
     */
    function getMatch(string memory _matchId) external view returns (Match memory) {
        return matches[_matchId];
    }

    /**
     * @dev Update platform fee (only owner)
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _newFee;
    }

    /**
     * @dev Withdraw platform fees (only owner)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner).transfer(balance);
    }

    /**
     * @dev Transfer ownership (only owner)
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }
}
